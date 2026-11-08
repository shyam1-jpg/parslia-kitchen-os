import Guard from "@/components/Guard";
import TaskBoard from "@/components/TaskBoard";
export default function Page() { return <Guard perm={["task.read", "group.read"]}><TaskBoard /></Guard>; }
