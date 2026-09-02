export const getApiErrorMessage = (error, fallback) => {
    const data = error?.response?.data;
    const message = data?.error || data?.detail;
    return typeof message === 'string' && message.trim() ? message : fallback;
};


export const buildOverridePayload = (request, action, reason) => {
    const payload = { action, reason };
    if (request?._isSubstitute && request?.principal_id) {
        payload.acting_as_substitute_for = request.principal_id;
    }
    return payload;
};
