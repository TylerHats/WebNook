import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';

const FFMPEG_PATH = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';

/**
 * Converts an uploaded image to lossless WebP format, preserving transparency,
 * and deletes the original uploaded temp file. If FFmpeg fails, falls back gracefully to original format.
 */
export function processImageUpload(inputPath: string, targetDir: string, filenamePrefix: string): Promise<string> {
  return new Promise((resolve) => {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(inputPath) || '.webp';
    const outputFilename = `${filenamePrefix}_${Date.now()}.webp`;
    const outputPath = path.join(targetDir, outputFilename);

    // Run FFmpeg libwebp encoder with lossless 1 mode
    execFile(
      FFMPEG_PATH,
      ['-i', inputPath, '-c:v', 'libwebp', '-lossless', '1', '-y', outputPath],
      (error) => {
        if (!error && fs.existsSync(outputPath)) {
          // Success: clean up input file
          if (fs.existsSync(inputPath)) {
            try { fs.unlinkSync(inputPath); } catch (e) {}
          }
          return resolve(outputFilename);
        }

        console.warn('[MediaService Warning] FFmpeg conversion failed, using fallback copy:', error?.message);
        // Fallback: move/copy original input file to target directory
        const fallbackFilename = `${filenamePrefix}_${Date.now()}${ext}`;
        const fallbackPath = path.join(targetDir, fallbackFilename);

        try {
          fs.copyFileSync(inputPath, fallbackPath);
          if (fs.existsSync(inputPath)) {
            try { fs.unlinkSync(inputPath); } catch (e) {}
          }
          resolve(fallbackFilename);
        } catch (copyErr) {
          console.error('[MediaService Error] Fallback copy failed:', copyErr);
          resolve(path.basename(inputPath));
        }
      }
    );
  });
}

/**
 * Converts an uploaded audio file to standard 44.1kHz stereo MP3,
 * and deletes the original uploaded temp file. If FFmpeg fails, falls back gracefully.
 */
export function processAudioUpload(inputPath: string, targetDir: string, filenamePrefix: string): Promise<string> {
  return new Promise((resolve) => {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(inputPath) || '.mp3';
    const outputFilename = `${filenamePrefix}_${Date.now()}.mp3`;
    const outputPath = path.join(targetDir, outputFilename);

    // Run FFmpeg audio resampling: 44.1kHz, 2 channels, 190k bitrate
    execFile(
      FFMPEG_PATH,
      ['-i', inputPath, '-ar', '44100', '-ac', '2', '-b:a', '190k', '-y', outputPath],
      (error) => {
        if (!error && fs.existsSync(outputPath)) {
          // Success: clean up input file
          if (fs.existsSync(inputPath)) {
            try { fs.unlinkSync(inputPath); } catch (e) {}
          }
          return resolve(outputFilename);
        }

        console.warn('[MediaService Warning] FFmpeg audio conversion failed, using fallback copy:', error?.message);
        const fallbackFilename = `${filenamePrefix}_${Date.now()}${ext}`;
        const fallbackPath = path.join(targetDir, fallbackFilename);

        try {
          fs.copyFileSync(inputPath, fallbackPath);
          if (fs.existsSync(inputPath)) {
            try { fs.unlinkSync(inputPath); } catch (e) {}
          }
          resolve(fallbackFilename);
        } catch (copyErr) {
          console.error('[MediaService Error] Audio fallback copy failed:', copyErr);
          resolve(path.basename(inputPath));
        }
      }
    );
  });
}
