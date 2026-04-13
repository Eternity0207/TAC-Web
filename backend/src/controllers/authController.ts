import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";
import googleSheets from "../services/googleSheets";
import { AuthRequest } from "../middleware/auth";
import { UserRole, UserStatus } from "../types";

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res
        .status(400)
        .json({ success: false, message: "Email and password required" });
      return;
    }

    const admin = await googleSheets.getAdminByEmail(email);
    if (!admin) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    // Check if user is inactive - block login
    const userStatus = String(admin.status);
    if (userStatus === UserStatus.INACTIVE || userStatus === "INACTIVE") {
      res
        .status(403)
        .json({
          success: false,
          message:
            "Your account has been deactivated. Please contact administrator.",
        });
      return;
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role, name: admin.name },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    await googleSheets.updateAdminLastLogin(admin.id);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    const admin = await googleSheets.getAdminByEmail(req.user.email);
    if (!admin) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function initAdmin(req: Request, res: Response): Promise<void> {
  try {
    const existing = await googleSheets.getAdminByEmail(config.admin.email);
    if (existing) {
      res.status(400).json({ success: false, message: "Admin already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(config.admin.password, 12);
    const admin = await googleSheets.createAdminUser({
      email: config.admin.email,
      passwordHash,
      name: "Admin",
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });

    res.status(201).json({
      success: true,
      message: "Admin created",
      data: { email: admin.email, name: admin.name },
    });
  } catch (error) {
    console.error("Init admin error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
