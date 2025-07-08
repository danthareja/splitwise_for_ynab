-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- Migrate existing name data to firstName and lastName
UPDATE "User" 
SET 
    "firstName" = CASE 
        WHEN "name" IS NOT NULL AND "name" != '' THEN 
            TRIM(SPLIT_PART("name", ' ', 1))
        ELSE NULL
    END,
    "lastName" = CASE 
        WHEN "name" IS NOT NULL AND "name" != '' AND POSITION(' ' IN "name") > 0 THEN 
            TRIM(SUBSTRING("name" FROM POSITION(' ' IN "name") + 1))
        ELSE NULL
    END
WHERE "name" IS NOT NULL;
