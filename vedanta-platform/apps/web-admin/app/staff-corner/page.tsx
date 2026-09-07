import Guard from "@/components/Guard";
import StaffCorner from "@/components/StaffCorner";
export default function Page() { return <Guard perm="cover.read"><StaffCorner /></Guard>; }
