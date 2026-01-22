-- Migration: Add Feishu URL fields
-- Purpose: Allow workshops and lessons to link directly to Feishu documents/tables

-- Add feishu_url column to workshops table
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS feishu_url TEXT;

-- Add feishu_url column to lessons table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS feishu_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.workshops.feishu_url IS 'External link to Feishu document or table for this workshop';
COMMENT ON COLUMN public.lessons.feishu_url IS 'External link to Feishu document or table for this lesson';
