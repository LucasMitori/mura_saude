import { getDatabase } from "#server/utils/mongodb";
import { getAuthUser } from "#server/utils/auth";
import { ObjectId } from "mongodb";

export default defineEventHandler(async (event) => {
    const { userId } = getAuthUser(event);

    const db = await getDatabase();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne(
        { _id: new ObjectId(userId) },
        { projection: { password: 0 } },
    );

    if (!user) {
        throw createError({ statusCode: 404, message: "User not found" });
    }

    return {
        id: user._id.toString(),
        name: user.name as string,
        email: user.email as string,
        role: (user.role as string) || "viewer",
        createdAt: (user.createdAt as Date)?.toISOString?.() ?? "",
    };
});
