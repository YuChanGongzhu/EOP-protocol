-- AlterEnum
BEGIN;
CREATE TYPE "CatRarity_new" AS ENUM ('R', 'SR', 'SSR', 'UR');
ALTER TABLE "cat_nfts" ALTER COLUMN "rarity" TYPE "CatRarity_new" USING ("rarity"::text::"CatRarity_new");
ALTER TYPE "CatRarity" RENAME TO "CatRarity_old";
ALTER TYPE "CatRarity_new" RENAME TO "CatRarity";
DROP TYPE "CatRarity_old";
COMMIT;

-- AlterTable
ALTER TABLE "cat_nfts" DROP COLUMN IF EXISTS "attributes",
ADD COLUMN     "color" VARCHAR(50) NOT NULL DEFAULT 'black',
ADD COLUMN     "metadata" JSONB;

