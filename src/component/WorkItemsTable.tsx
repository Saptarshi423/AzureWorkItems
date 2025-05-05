import React, { useEffect, useState } from "react";
import { fetchToDoItems } from "../services/azureDevOps";

type WorkItem = {
  SlNo: number;
  id: number;
  title: string;
  createdDate: string;
  responseTime?: string; // new field
  market: string
};

export const WorkItemsTable: React.FC = () => {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [sortedAsc, setSortedAsc] = useState<Boolean>(true);
  const [loading, setLoading] = useState<Boolean>(false);

  useEffect(() => {
    setLoading(true);
    fetchToDoItems()
      .then((data) => {
        data.sort((a, b) => calculateDaysOpen(a.createdDate) - calculateDaysOpen(b.createdDate));
        setWorkItems([...data]);
      })
      .catch((error) => {
        console.error("Error fetching work items:", error);
      }
      )
    setLoading(false);
  }, []);

  const calculateDaysOpen = (createdDate: string): number => {
    const created = new Date(createdDate);
    const now = new Date();
    const diff = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const sortByDaysSinceOpen = (): void => {
    const sorted = [...workItems].sort((a, b) =>
      sortedAsc ? calculateDaysOpen(b.createdDate) - calculateDaysOpen(a.createdDate) : calculateDaysOpen(a.createdDate) - calculateDaysOpen(b.createdDate)
    );
    setSortedAsc(!sortedAsc);
    setWorkItems(sorted);
  };

  const getClassName = (market: string): string => {
    switch (market) {
      case "FE&C":
        return "green";
      case "FB&T":
        return "bg-blue";
      case "C&T":
        return "bg-yellow";
      default:
        return ""; // Default class for other markets
    }

  }

  return (
    <>
      {loading && <div>Loading...</div>}
      {workItems.length > 0 && <div className="p-4">
        {/* <h1 className="text-xl font-bold mb-4">Azure DevOps Inbox</h1> */}
        <table>
          <thead>
            <tr >
              <th style={{ textAlign: "center" }}>Sl No</th>
              <th style={{ textAlign: "center" }}>Incident ID</th>
              <th style={{ textAlign: "center" }} >Title</th>
              <th style={{ textAlign: "center" }}>Market</th>
              <th style={{ textAlign: "center", cursor: "pointer" }} onClick={sortByDaysSinceOpen}>Days Since Open</th>
              <th style={{ textAlign: "center", cursor: "pointer" }}>Initial Response Time</th>
            </tr>
          </thead>
          <tbody>
            {workItems.map((item, index) => (
              <tr key={item.id} className={getClassName(item.market)}>
                <td style={{ textAlign: "center" }}>{index + 1}</td>
                <td style={{ textAlign: "center" }}>{item.id}</td>
                <td style={{ textAlign: "center" }}>{item.title}</td>
                <td style={{ textAlign: "center" }}>{item.market}</td>
                <td style={{ textAlign: "center" }}>{calculateDaysOpen(item.createdDate)}</td>
                <td style={{ textAlign: "center" }}>{item.responseTime !== undefined
                  ? item.responseTime
                  : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </>

  );
};


// com.ndc.Bric1.hostname = 10.0.14.223
// com.ndc.Bric2.hostname = 10.0.14.224

// com.ndc.maxScanner = 2
// com.ndc.maxGage = 2
// com.ndc.maxNet = 2
// com.ndc.maxBase = 2
// com.ndc.maxCloop = 2
// com.ndc.maxBric = 2

// com.ndc.Gage1.Bric = 1
// com.ndc.Gage1.type = TGAGE
// com.ndc.Gage1.Scanner = 1
// com.ndc.Gage1.Tach = 1
// com.ndc.Gage1.ipName = 10.0.14.227
// com.ndc.Gage2.Bric = 2
// com.ndc.Gage2.type = TGAGE
// com.ndc.Gage2.Scanner = 2
// com.ndc.Gage2.Tach = 1
// com.ndc.Gage2.ipName = 10.0.14.228

// com.ndc.Scanner1.Bric = 1
// com.ndc.Scanner1.isFixed = false
// com.ndc.Scanner2.Bric = 2
// com.ndc.Scanner2.isFixed = false