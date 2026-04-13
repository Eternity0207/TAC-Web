import { Request, Response } from 'express';
import * as sheetsService from '../services/googleSheets';
import { AuthRequest } from '../middleware/auth';

// Public: Get open career listings (for landing page)
export async function getPublicCareers(req: Request, res: Response): Promise<void> {
    try {
        const allCareers = await sheetsService.getAllCareers();
        const openCareers = allCareers.filter((c: any) => c.status === 'OPEN');
        res.json({ success: true, data: openCareers });
    } catch (error) {
        console.error('Get public careers error:', error);
        res.status(500).json({ success: false, message: 'Failed to get careers' });
    }
}

// Protected: Get all career listings (for admin)
export async function getAllCareers(req: AuthRequest, res: Response): Promise<void> {
    try {
        const careers = await sheetsService.getAllCareers();
        res.json({ success: true, data: careers });
    } catch (error) {
        console.error('Get all careers error:', error);
        res.status(500).json({ success: false, message: 'Failed to get careers' });
    }
}

// Protected: Create career listing
export async function createCareer(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { title, department, location, type, description, requirements, salary, status } = req.body;

        if (!title) {
            res.status(400).json({ success: false, message: 'Title is required' });
            return;
        }

        const result = await sheetsService.createCareer({
            title,
            department,
            location,
            type: type || 'Full-Time',
            description,
            requirements,
            salary,
            status: status || 'DRAFT',
            postedBy: req.user?.name || req.user?.email || '',
        });

        res.json(result);
    } catch (error) {
        console.error('Create career error:', error);
        res.status(500).json({ success: false, message: 'Failed to create career' });
    }
}

// Protected: Update career listing
export async function updateCareer(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const result = await sheetsService.updateCareer(id, req.body);
        res.json(result);
    } catch (error) {
        console.error('Update career error:', error);
        res.status(500).json({ success: false, message: 'Failed to update career' });
    }
}

// Protected: Delete career listing
export async function deleteCareer(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const result = await sheetsService.deleteCareer(id);
        res.json(result);
    } catch (error) {
        console.error('Delete career error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete career' });
    }
}

// Public: Submit application (from landing page)
export async function submitApplication(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, jobTitle, applicantName, applicantEmail, applicantPhone, resumeBase64, resumeMimeType, resumeUrl, coverLetter, experience, currentLocation } = req.body;

        if (!jobId || !applicantName || !applicantEmail || !applicantPhone) {
            res.status(400).json({ success: false, message: 'Job ID, name, email, and phone are required' });
            return;
        }

        const result = await sheetsService.createApplication({
            jobId,
            jobTitle,
            applicantName,
            applicantEmail,
            applicantPhone,
            resumeBase64,
            resumeMimeType,
            resumeUrl,
            coverLetter,
            experience,
            currentLocation,
        });

        res.json(result);
    } catch (error) {
        console.error('Submit application error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit application' });
    }
}

// Protected: Get all applications (for admin)
export async function getAllApplications(req: AuthRequest, res: Response): Promise<void> {
    try {
        const applications = await sheetsService.getAllApplications();
        res.json({ success: true, data: applications });
    } catch (error) {
        console.error('Get all applications error:', error);
        res.status(500).json({ success: false, message: 'Failed to get applications' });
    }
}

// Protected: Get applications by job ID
export async function getApplicationsByJob(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const applications = await sheetsService.getApplicationsByJob(jobId);
        res.json({ success: true, data: applications });
    } catch (error) {
        console.error('Get applications by job error:', error);
        res.status(500).json({ success: false, message: 'Failed to get applications' });
    }
}

// Protected: Update application status/notes
export async function updateApplication(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const updates = { ...req.body };
        if (req.user?.name) {
            updates.reviewedBy = req.user.name;
        }
        const result = await sheetsService.updateApplication(id, updates);
        res.json(result);
    } catch (error) {
        console.error('Update application error:', error);
        res.status(500).json({ success: false, message: 'Failed to update application' });
    }
}
