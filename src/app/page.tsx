import Bannar from "./Components/Home/Bannar";
import Order from "./Components/Home/Order";
import Packages from "./Components/Home/Packages";
import WeeklyMenu from "./Components/Home/WeeklyMenu";

export default function Home() {
  return (
    <div className="bg-white">
     <Bannar/>
     <WeeklyMenu/>
     <Order/>
     <Packages/>
    </div>
  );
}
