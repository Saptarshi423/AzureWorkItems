// src/services/azureDevOps.ts
import axios from "axios";

const pat = import.meta.env.VITE_AZURE_PAT;
const org = import.meta.env.VITE_AZURE_ORG;
const project = import.meta.env.VITE_AZURE_PROJECT;

// const headers = {
//   Authorization: `Basic ${btoa(":" + pat)}`,
// };

// export async function fetchToDoItems() : Promise<{ id: number; createdDate: string, title:string}[]> {
//   const query = {
//     query: `
//       SELECT [System.Id]
//       FROM WorkItems
//       WHERE [System.TeamProject] = '${project}'
//       AND [System.State] IN ('To Do', 'Doing')
//     `,
//   };

//   const wiqlResponse = await axios.post(
//     `https://dev.azure.com/${org}/${project}/_apis/wit/wiql?api-version=7.0`,
//     query,
//     { headers }
//   );

//   const ids = wiqlResponse.data.workItems.map((item: any) => item.id).join(",");
//   if (!ids) return [];

//   const detailsResponse = await axios.get(
//     `https://dev.azure.com/${org}/_apis/wit/workitems?ids=${ids}&$select=System.Id,System.Title,System.CreatedDate&api-version=7.0`,
//     { headers }
//   );

//   return detailsResponse.data.value.map((item: any) => ({
//     id: item.id,
//     createdDate: item.fields["System.CreatedDate"],
//     title: item.fields["System.Title"],
//   }));
// }

interface WorkItem {
  SlNo: number;
  id: number;
  title: string;
  createdDate: string;
  responseTime?: string;
  market: string;
  url:string;
}

const validSenders = [
  "software@ndc.com",
  "karthik.selvaraj@nordson.com",
  "edwin.mckay@nordson.com",
  "paul.strutt@nordson.com",
  "paul.green1@nordson.com",
  "brad.hoffman@nordson.com",
  "Justin.Dunlap@nordson.com",
];
const authHeader = {
  Authorization: `Basic ${btoa(":" + pat)}`,
};

// Function to find and sort comments from valid senders
// This function filters comments to find those from valid senders and sorts them by created date
const findAndSortComments = (comments: any[]) => {
  const softwareComments = comments.filter((item: any) =>
    validSenders.some((sender) => item.text.includes(`From: ${sender}`))
  );

  return softwareComments.sort((a: any, b: any) => {
    return (
      new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
    );
  });
};

//Function to find market tags if any.
// This function checks if the tags contain any of the market tags and returns the first one found
const findMarketTag = (item: any) => {
  const tagsRaw = item.fields["System.Tags"];
  const priorityOrder = ["FE&C", "FB&T", "C&T"];

  if (!tagsRaw) return "Other";

  const tags = tagsRaw.split(";").map((tag: string) => tag.trim());
  const found = priorityOrder.find((tag) => tags.includes(tag));

  return found || "Other";
};

// Function to fetch work items from Azure DevOps
// This function fetches work items that are in the "To Do" or "Doing" state
export const fetchToDoItems = async (): Promise<WorkItem[]> => {
  const query = {
    query: `
        SELECT [System.Id], [System.Title], [System.CreatedDate], [System.Tags]
        FROM WorkItems
        WHERE [System.TeamProject] = '${project}'
        AND [System.State] IN ('To Do', 'Doing')
      `,
  };

  const wiqlResponse = await axios.post(
    `https://dev.azure.com/${org}/${project}/_apis/wit/wiql?api-version=7.0`,
    query,
    { headers: { ...authHeader, "Content-Type": "application/json" } }
  );

  const workItemIds = wiqlResponse.data.workItems.map((wi: any) => wi.id);

  const batchSize = 50; // Azure recommends small batch
  const batches = [];

  // Fetch work items in batches of 50
  for (let i = 0; i < workItemIds.length; i += batchSize) {
    const batchIds = workItemIds.slice(i, i + batchSize).join(",");
    const batch = await axios.get(
      `https://dev.azure.com/${org}/${project}/_apis/wit/workitems?ids=${batchIds}&fields=System.Id,System.Title,System.CreatedDate,System.Tags&api-version=7.0`,
      { headers: authHeader }
    );
    batches.push(...batch.data.value);
  }

  // Promise.all to fetch comments for each work item
  // and calculate response time
  const workItems: WorkItem[] = await Promise.all(
    batches.map(async (item: any, index: number) => {
      const createdDate = new Date(item.fields["System.CreatedDate"]); // Created date of the work item
      let responseTimeHours: number | undefined = undefined; // Calculate response time in hours
     
      // fetch comments for this work-item
      const commentsResponse = await axios.get(
        `https://dev.azure.com/${org}/${project}/_apis/wit/workItems/${item.id}/comments?api-version=7.0-preview.3`,
        { headers: authHeader }
      );
      // Check if comments exist
      const comments = commentsResponse.data.comments || [];

      // Filter comments to get only those from valid senders
      const softwareComments = findAndSortComments(comments);

      // Calculate response time if there are at least 2 comments
      // The first comment is the one from the software team, and the second is the response from the sender
      if (softwareComments.length >= 2) {
        const secondCommentDate = new Date(softwareComments[1].createdDate);
        const diffMs = secondCommentDate.getTime() - createdDate.getTime();
        responseTimeHours = diffMs / (1000 * 60 * 60); // hours
      }

      const getResponseTime = (responseTime: number | undefined) => {
        if (responseTime === undefined) return undefined; // No response time available
        if (responseTime < 24) return `${Math.round(responseTime)} hours`; // Less than a day

        return `${Math.round(responseTime / 24)} days`; // More than a day
      };

      return {
        SlNo: index + 1,
        id: item.id,
        title: item.fields["System.Title"] || "No Title",
        createdDate: item.fields["System.CreatedDate"],
        responseTime: getResponseTime(responseTimeHours),
        market: findMarketTag(item),
        url:item.url,
      };
    })
  );

  // Sort based on Market priority: FE&C -> FB&T -> C&T -> Others
  const priorityOrder = ["FE&C", "FB&T", "C&T"];

  workItems.sort((a, b) => {
    const aPriority = priorityOrder.indexOf(a.market || "");
    const bPriority = priorityOrder.indexOf(b.market || "");

    const aValue = aPriority === -1 ? Number.MAX_SAFE_INTEGER : aPriority;
    const bValue = bPriority === -1 ? Number.MAX_SAFE_INTEGER : bPriority;

    return aValue - bValue;
  });
  console.log("Work Items", workItems);

  // Return the sorted work items
  return workItems;
};
