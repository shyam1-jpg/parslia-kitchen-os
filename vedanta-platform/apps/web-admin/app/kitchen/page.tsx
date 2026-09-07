import Guard from "@/components/Guard";
import Kitchen from "@/components/Kitchen";
export default function Page() { return <Guard perm="covers.read"><Kitchen /></Guard>; }
