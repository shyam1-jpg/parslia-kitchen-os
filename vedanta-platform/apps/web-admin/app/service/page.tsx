import Guard from "@/components/Guard";
import DeptBoards from "@/components/DeptBoards";
export default function Page() { return <Guard perm="group.read"><DeptBoards /></Guard>; }
