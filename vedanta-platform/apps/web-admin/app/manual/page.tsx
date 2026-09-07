import Guard from "@/components/Guard";
import HouseManual from "@/components/HouseManual";
export default function Page() { return <Guard perm={["group.read", "sop.read", "cover.read"]}><HouseManual /></Guard>; }
