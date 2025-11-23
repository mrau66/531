// .eleventy.js
const CleanCSS = require("clean-css");
const { minify } = require("terser");
const fs = require("fs");
const path = require("path");

module.exports = function (eleventyConfig) {
  // Copy static assets
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/js");
  
  // Copy favicon
  eleventyConfig.addPassthroughCopy("src/favicon.ico");
  
  eleventyConfig.addPassthroughCopy({
    "node_modules/validator/validator.min.js": "js/vendor/validator.min.js"
  });

  // Transform CSS files for minification
  eleventyConfig.addTransform("cssmin", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".css")) {
      let minified = new CleanCSS({}).minify(content);
      return minified.styles;
    }
    return content;
  });

  // Only minify JS in production
  const isProduction = process.env.NODE_ENV === 'production' || process.env.ELEVENTY_ENV === 'production';
  
  if (isProduction) {
    console.log("🏭 Production mode: JS minification enabled");
    
    // Minify JS files after build completes
    eleventyConfig.on("afterBuild", () => {
      const srcDir = "./src/js"; 
      const outputDir = "./_site/js";

      const minifyFilesInDirectory = (srcDir, outputDir) => {
        if (!fs.existsSync(srcDir)) {
          console.log(`Source directory ${srcDir} doesn't exist, skipping JS minification`);
          return;
        }

        fs.readdirSync(srcDir).forEach(file => {
          const srcFilePath = path.join(srcDir, file);
          const outputFilePath = path.join(outputDir, file);

          // If it's a directory, recursively process it
          if (fs.statSync(srcFilePath).isDirectory()) {
            const nestedOutputDir = path.join(outputDir, file);
            fs.mkdirSync(nestedOutputDir, { recursive: true });
            minifyFilesInDirectory(srcFilePath, nestedOutputDir);
          } else if (path.extname(file) === ".js") {
            // Only process .js files
            console.log(`Minifying: ${file}`);
            const code = fs.readFileSync(srcFilePath, "utf-8");

            minify(code).then(minified => {
              fs.writeFileSync(outputFilePath, minified.code, "utf-8");
              console.log(`✅ Minified: ${file}`);
            }).catch(err => {
              console.error(`❌ Terser error in ${file}:`, err.message);
              // Keep the original file if minification fails
              fs.copyFileSync(srcFilePath, outputFilePath);
            });
          }
        });
      };

      console.log("🔧 Starting JS minification...");
      minifyFilesInDirectory(srcDir, outputDir);
    });
  } else {
    console.log("🛠️  Development mode: JS minification disabled");
  }

  // Watch for changes in JS and CSS files
  eleventyConfig.addWatchTarget("./src/js/");
  eleventyConfig.addWatchTarget("./src/assets/css/");

  // read .env secrets
  require("dotenv").config();

  // Add environment variables as global data
  eleventyConfig.addGlobalData("env", {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  });

  // Minify CSS filter (for inline CSS)
  eleventyConfig.addFilter("cssmin", function (code) {
    return new CleanCSS({}).minify(code).styles;
  });

  // Debug: Log environment variables
  console.log("🔍 Environment check:");
  console.log(
    "SUPABASE_URL:",
    process.env.SUPABASE_URL ? "✅ Set" : "❌ Not set"
  );
  console.log(
    "SUPABASE_ANON_KEY:",
    process.env.SUPABASE_ANON_KEY ? "✅ Set" : "❌ Not set"
  );

  // Add a simple filter for calculations
  eleventyConfig.addFilter(
    "calculateTM",
    function (oneRepMax, cycle, isOHP = false) {
      const baseTM = Math.round(oneRepMax * 0.85 * 2) / 2;
      const increment = isOHP ? 1.25 : 2.5;
      return baseTM + (cycle - 1) * increment;
    }
  );

  eleventyConfig.addFilter("roundToPlate", function (weight) {
    return Math.round(weight * 2) / 2;
  });

  // Add global data
  eleventyConfig.addGlobalData("site", {
    title: "531 x 365 Calculator",
    description: "Complete 531 x 365 training program calculator",
    url: "https://glowing-peony-483316.netlify.app/",
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
  };
};