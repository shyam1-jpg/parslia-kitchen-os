import Guard from "@/components/Guard";
import Housekeeping from "@/components/Housekeeping";
export default function Page() { return <Guard perm="group.read"><Housekeeping /></Guard>; }
