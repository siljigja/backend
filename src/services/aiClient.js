const { analyzeInput } = require('./analyzerService');

const analyzeContent = async ({ projectId, inputType, content, filePath }) =>
  analyzeInput({
    project_id: projectId || null,
    input_type: inputType,
    content,
    file_path: filePath || null
  });

module.exports = {
  analyzeContent
};

