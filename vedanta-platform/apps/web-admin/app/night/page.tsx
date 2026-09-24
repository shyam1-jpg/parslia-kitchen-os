import Guard from "@/components/Guard";
import NightPorter from "@/components/NightPorter";
export default function Page() { return <Guard perm="group.read"><NightPorter /></Guard>; }
