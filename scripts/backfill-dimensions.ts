import fs from "fs";
import path from "path";
import sharp from "sharp";

const modelsPath = path.join(process.cwd(), "data/models.json");

async function processModels() {
  const fileContent = fs.readFileSync(modelsPath, "utf-8");
  let models = JSON.parse(fileContent);

  // If it's the paginated format { data: [], ... }
  let data = Array.isArray(models) ? models : models.data;
  let isPaginated = !Array.isArray(models);

  let updatedCount = 0;

  for (const model of data) {
    if (model.images && model.images.length > 0) {
      const newImages = [];
      for (const img of model.images) {
        if (typeof img === "string") {
          try {
            // Check if it's a local file or remote URL
            if (img.startsWith("http")) {
              // Fetch remote image
              const response = await fetch(img);
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const metadata = await sharp(buffer).metadata();

              newImages.push({
                url: img,
                width: metadata.width,
                height: metadata.height,
              });
              updatedCount++;
              console.log(
                `Updated remote image (from string) for ${model.name}`,
              );
            } else {
              const localPath = path.join(
                process.cwd(),
                "apps/web/public",
                img,
              );
              if (fs.existsSync(localPath)) {
                const metadata = await sharp(localPath).metadata();
                newImages.push({
                  url: img,
                  width: metadata.width,
                  height: metadata.height,
                });
                updatedCount++;
                console.log(
                  `Updated local image (from string) for ${model.name}`,
                );
              } else {
                console.log(`Could not find local image: ${localPath}`);
                newImages.push(img); // Keep as string
              }
            }
          } catch (e) {
            console.error(
              `Failed to process image ${img} for ${model.name}:`,
              e,
            );
            newImages.push(img);
          }
        } else {
          // Already an object, but check if we need to fix dimensions
          // Specifically if width is 4000 and height is 3000 which might be default placeholders
          // Or simply force update for all remote URLs to be safe
          if (img.url.startsWith("http")) {
            try {
              const response = await fetch(img.url);
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const metadata = await sharp(buffer).metadata();

              // Handle EXIF orientation
              let finalWidth = metadata.width;
              let finalHeight = metadata.height;

              if (metadata.orientation && metadata.orientation >= 5) {
                // Swap width and height for rotated images (5, 6, 7, 8)
                finalWidth = metadata.height;
                finalHeight = metadata.width;
              }

              // Only update if dimensions differ significantly or just act as source of truth
              if (finalWidth !== img.width || finalHeight !== img.height) {
                newImages.push({
                  url: img.url,
                  width: finalWidth,
                  height: finalHeight,
                });
                updatedCount++;
              } else {
                newImages.push(img);
              }
            } catch (e) {
              console.error(
                `Failed to refresh dimensions for ${model.name}`,
                e,
              );
              newImages.push(img);
            }
          } else {
            newImages.push(img);
          }
        }
      }
      model.images = newImages;
    }
  }

  if (isPaginated) {
    models.data = data;
  } else {
    models = data;
  }

  fs.writeFileSync(modelsPath, JSON.stringify(models, null, 2));
  console.log(`Updated ${updatedCount} images.`);
}

processModels();
