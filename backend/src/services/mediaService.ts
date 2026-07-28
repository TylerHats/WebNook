import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';

const FFMPEG_PATH = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';

/**
 * Converts an uploaded image to lossless WebP format, preserving transparency,
 * and deletes the original uploaded temp file.
 */
export function processImageUpload(inputPath: string, targetDir: string, filenamePrefix: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const outputFilename = `${filenamePrefix}_${Date.now()}.webp`;
    const outputPath = path.join(targetDir, outputFilename);

    // Run FFmpeg libwebp encoder with lossless 1 mode
    execFile(
      FFMPEG_PATH,
      ['-i', inputPath, '-c:v', 'libwebp', '-lossless', '1', '-y', outputPath],
      (error) => {
        // Always attempt to delete original temp file
        if (fs.existsSync(inputPath)) {
          try { fs.unlinkSync(inputPath); } catch (e) {}
        }

        if (error) {
          console.error('[MediaService Error] FFmpeg WebP conversion failed:', error.message);
          // If conversion fails, check if input file existed or fallback
          return reject(new Error('Image processing failed'));
        }

        resolve(outputFilename);
      }
    );
  });
}

/**
 * Converts an uploaded audio file to standard 44.1kHz stereo MP3,
 * and deletes the original uploaded temp file.
 */
export function processAudioUpload(inputPath: string, targetDir: string, filenamePrefix: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const outputFilename = `${filenamePrefix}_${Date.now()}.mp3`;
    const outputPath = path.join(targetDir, outputFilename);

    // Run FFmpeg audio resampling: 44.1kHz, 2 channels, 190k bitrate
    execFile(
      FFMPEG_PATH,
      ['-i', inputPath, '-ar', '44100', '-ac', '2', '-b:a', '190k', '-y', outputPath],
      (error) => {
        // Always attempt to delete original temp file
        if (fs.existsSync(inputPath)) {
          try { fs.unlinkSync(inputPath); } catch (e) {}
        }

        if (error) {
          console.error('[MediaService Error] FFmpeg audio conversion failed:', error.message);
          return reject(new Error('Audio processing failed'));
        }

        resolve(outputFilename);
      }
    );
  });
}
