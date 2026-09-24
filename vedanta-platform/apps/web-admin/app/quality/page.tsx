import Guard from "@/components/Guard";
import QualityBoard from "@/components/QualityBoard";
export default function Page() { return <Guard perm="group.update"><QualityBoard /></Guard>; }
