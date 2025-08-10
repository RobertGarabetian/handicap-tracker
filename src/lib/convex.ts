import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://bright-goat-576.convex.cloud");

export { convex, ConvexProvider };
