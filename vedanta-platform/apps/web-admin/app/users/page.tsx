import Guard from "@/components/Guard";
import Users from "@/components/Users";
export default function Page() { return <Guard perm="user.manage"><Users /></Guard>; }
