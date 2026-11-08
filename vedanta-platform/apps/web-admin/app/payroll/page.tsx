import Guard from "@/components/Guard";
import Payroll from "@/components/Payroll";
export default function Page() { return <Guard perm={["clock.manage", "hr.read"]}><Payroll /></Guard>; }
