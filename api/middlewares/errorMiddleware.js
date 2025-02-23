export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource was not found"
  });
};

export const errorHandler = (error, req, res) => {
  console.error(error.stack);
  res.status(error.status || 500).json({
    error: "Internal Server Error",
    message: error.message || "Something went wrong"
  });
};
