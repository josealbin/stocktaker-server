import jwt from 'jsonwebtoken';


const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Access Denied" });
    }

    const token = authHeader.split(" ")[1]; // Extract token after "Bearer"

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded; // Store user details in req.user
        next();
    } catch (error) {
        return res.status(403).json({ message: "Invalid Token" });
    }
};

export default authenticateUser;