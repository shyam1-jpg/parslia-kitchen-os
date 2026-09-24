import Guard from "@/components/Guard";
import HouseToday from "@/components/HouseToday";
export default function Page() { return <Guard perm="group.read"><HouseToday /></Guard>; }
