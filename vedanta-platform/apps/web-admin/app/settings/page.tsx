import Guard from "@/components/Guard";
import Settings from "@/components/Settings";
export default function Page() { return <Guard perm="package.manage"><Settings /></Guard>; }
