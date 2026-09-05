import Guard from "@/components/Guard";
import RoomBoard from "@/components/RoomBoard";
export default function Page() { return <Guard perm="group.read"><RoomBoard /></Guard>; }
