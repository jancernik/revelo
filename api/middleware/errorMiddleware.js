export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource was not found"
  });
};

export const errorHandler = (err, req, res) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: err.message || "Something went wrong"
  });
};
