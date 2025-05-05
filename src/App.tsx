// src/App.tsx
import { WorkItemsTable } from "./component/WorkItemsTable";

function App() {
  // const [items, setItems] = useState<WorkItem[]>([]);

  // useEffect(() => {
  //   fetchToDoItems().then(setItems);
  // }, []);

  return (
    <div>
      <WorkItemsTable/>
    </div>
  );
}

export default App;
