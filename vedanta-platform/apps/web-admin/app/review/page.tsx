import Guard from "@/components/Guard";
import Review from "@/components/Review";
export default function Page() { return <Guard perm="group.update"><Review /></Guard>; }
