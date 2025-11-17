const multer = require('multer');
const path = require('node:path');

const allowedExtensions = new Set([
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.m',
  '.mm',
  '.json',
  '.txt',
  '.md',
  '.yaml',
  '.yml'
]);
const MAX_SIZE = 200 * 1024 * 1024; // 200MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!allowedExtensions.has(ext)) {
    return cb(new Error('허용되지 않은 파일 유형입니다. 텍스트/소스 코드 파일만 업로드할 수 있습니다.'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter
});

const singleArtifactUpload = upload.single('artifact');

module.exports = {
  singleArtifactUpload
};
