INSERT INTO config_kv(config_type, config_data)
VALUES ('bulkPricing', '{}'::jsonb)
ON CONFLICT (config_type) DO NOTHING;

INSERT INTO config_kv(config_type, config_data)
VALUES ('socialLinks', '{}'::jsonb)
ON CONFLICT (config_type) DO NOTHING;
