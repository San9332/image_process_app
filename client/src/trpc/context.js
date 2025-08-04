export const createContext = ({ req, res }) => {
    return {
        req,
        res,
        user: req.user ?? null,
    };
};
