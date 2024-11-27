import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

const reencodeVideo = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`Reencoding failed: ${err.message}`)))
      .run();
  });
};

export const captureFrames = (videoPath, outputDir, frameCount = 6) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    ffmpeg.ffprobe(videoPath, async (err, metadata) => {
      if (err || !metadata.format.duration || isNaN(metadata.format.duration)) {
        console.error('FFprobe failed. Reencoding the video...');
        const reencodedPath = path.join(outputDir, 'reencoded.mp4');
        try {
          await reencodeVideo(videoPath, reencodedPath);
          videoPath = reencodedPath;
          metadata = await new Promise((resolve, reject) =>
            ffmpeg.ffprobe(reencodedPath, (err, newMetadata) => (err ? reject(err) : resolve(newMetadata)))
          );
        } catch (error) {
          return reject(new Error(`Reencoding failed: ${error.message}`));
        }
      }

      const duration = metadata.format.duration;
      if (!duration || isNaN(duration)) {
        return reject(new Error('Video duration not found or invalid.'));
      }

      console.log(`Video Duration: ${duration} seconds`);

      const timestamps = Array.from({ length: frameCount }, (_, i) => (duration * (i + 1)) / (frameCount + 1));
      console.log(`Capture timestamps: ${timestamps}`);

      ffmpeg(videoPath)
        .inputOptions('-accurate_seek')
        .screenshots({
          timestamps,
          folder: outputDir,
          filename: `frame-%03d.jpg`, // 명확한 이름 설정
        })
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('end', () => {
          const files = fs.readdirSync(outputDir)
            .filter((file) => file.startsWith('frame') && file.endsWith('.jpg'))
            .map((file) => path.join(outputDir, file));
          console.log('Captured frames:', files);
          resolve(files);
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err.message);
          reject(new Error(`FFmpeg processing error: ${err.message}`));
        });
    });
  });
};




