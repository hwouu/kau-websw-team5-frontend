import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import prisma from '../prismaClient.js';

let isRecording = false;
let ffmpegProcess;

export const startStream = (req, res) => {
  res.send('Stream started');
};

export const startRecording = (req, res) => {
  if (isRecording) return res.status(400).json({ message: 'Already recording' });

  const outputPath = path.join(__dirname, '..', 'public', 'recordings', 'output.mp4');
  ffmpegProcess = ffmpeg('udp://localhost:1234')
    .videoCodec('libx264')
    .outputOptions(['-preset veryfast', '-tune zerolatency'])
    .save(outputPath);

  isRecording = true;
  res.status(200).json({ message: 'Recording started' });
};

export const stopRecording = (req, res) => {
  if (!isRecording) return res.status(400).json({ message: 'Not recording' });

  ffmpegProcess.on('end', () => console.log('Recording saved'));
  ffmpegProcess.kill('SIGINT');
  isRecording = false;

  res.status(200).json({ message: 'Recording stopped' });
};

// Upload the recorded file and save the path in DB
export const uploadRecording = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const filePath = path.join('/recordings', file.filename); // .mp4 확장자 포함
    await prisma.recording.create({
      data: {
        filePath,
        createdAt: new Date(),
      },
    });
    res.status(200).json({ message: 'File uploaded successfully', path: filePath });
  } catch (error) {
    res.status(500).json({ message: 'Database error', error });
  }
};


