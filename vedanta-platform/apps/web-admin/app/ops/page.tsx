import Guard from "@/components/Guard";
import OpsBoard from "@/components/OpsBoard";
export default function Page() { return <Guard perm="group.read"><OpsBoard /></Guard>; }
