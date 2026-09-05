import Guard from "@/components/Guard";
import FrontDesk from "@/components/FrontDesk";
export default function Page() { return <Guard perm="group.read"><FrontDesk /></Guard>; }
