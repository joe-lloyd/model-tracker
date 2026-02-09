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
            // Assuming current images are local in public/ or absolute paths?
            // Previous conversations suggest images might be in src/assets or public.
            // Let's check if it starts with http
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
              console.log(`Updated remote image for ${model.name}`);
            } else {
              // Assume local path relative to public?
              // Most likely /images/...
              // We need to resolve the file path.
              // Let's try to map the URL to a local file.
              // common pattern: /src/assets is not served statically usually without build.
              // user mentions "json file" so data is static.
              // changing "src" to "public" might work if mapped.

              // Fallback: don't touch if we can't find it easily?
              // actually, we should probably just support remote URLs for now as cloudinary was mentioned.
              // If local strings exist, we can try to resolve them.
              // let's try assuming they are in apps/web/public if they start with /
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
                console.log(`Updated local image for ${model.name}`);
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
          // Already an object
          newImages.push(img);
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
