import Guard from "@/components/Guard";
import GroupsScreen from "@/components/GroupsScreen";
export default function Page() { return <Guard perm="group.read"><GroupsScreen /></Guard>; }
