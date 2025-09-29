export const successResponse = (c, data, message, status = 200) => {
    const response = {
        success: true,
        data,
        message,
    };
    return c.json(response, status);
};
export const errorResponse = (c, error, status = 400) => {
    const response = {
        success: false,
        error,
    };
    return c.json(response, status);
};
