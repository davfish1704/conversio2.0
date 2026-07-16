-- Add waPhoneNumber field to board_channels
-- Stores the actual E.164 phone number (e.g. +4915112345678) for wa.me invite links.
-- Distinct from waPhoneNumberId which is Meta's internal Phone Number ID used for API calls.
ALTER TABLE "board_channels" ADD COLUMN IF NOT EXISTS "waPhoneNumber" TEXT;
