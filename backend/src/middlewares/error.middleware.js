function errorHandler(err, req, res, next) {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON payload',
    });
  }

  if (err.message && err.message.toLowerCase().includes('jwt')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authentication token',
    });
  }

  if (err.message && err.message.toLowerCase().includes('token used too late')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Expired Google token',
    });
  }

  console.error(err);

  return res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong',
  });
}

module.exports = {
  errorHandler,
};