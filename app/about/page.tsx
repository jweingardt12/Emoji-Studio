import React from "react";
import Image from "next/image";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function AboutPage() {
  return (
    <div className="py-8 px-4 lg:px-6 flex justify-center">
      <div className="rounded-xl bg-card border border-border shadow p-6 sm:p-8 max-w-4xl w-full animate-fade-up">
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-16 h-16 mb-3">
            <Image src="/logo.png" alt="Emoji Studio Logo" fill className="object-contain" priority />
          </div>
          <h1 className="text-3xl font-bold text-center">Emoji Studio</h1>
          <p className="text-muted-foreground text-sm mt-1">Sometimes the most important OKRs are LOLs.</p>
        </div>
        <p className="mb-4">
          Emoji Studio is a Slack emoji dashboard that lets you visualize, explore, and analyze your workspace's custom emoji collection. This product exists because Slack provides no good way to showcase your co-workers emoji contributions. Custom emojis are an expression of company culture, and while Slack makes it simple to create them, it doesn't provide a good way to explore them.
          <br />
          <br />
          <a href="https://jwe.in?utm_source=emojistudio&utm_medium=aboutpage" target="_blank" rel="noopener noreferrer">
            This project also serves as a way for me (<u>Jason</u>) to learn and experiment with building out some of the silly ideas I've had on my own backlog.
          </a>
        </p>
        <div className="border-t border-border my-10"></div>
        <h1 className="text-2xl font-bold mb-6">FAQs</h1>
        <div>
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>What is Emoji Studio?</AccordionTrigger>
              <AccordionContent>
                Emoji Studio is a dashboard for visualizing and exploring your Slack workspace's custom emoji collection. It shows emoji creation trends, creator leaderboards, and detailed information about each emoji in the style of a SaaS product dashboard. Yes, it's a bit silly.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Why would you make this?</AccordionTrigger>
              <AccordionContent>
                <a href="https://www.linkedin.com/in/jasonweingardt/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
                  Every company I've worked at
                </a> has had one thing in common: a thriving custom Slack emoji collection. Emojis are one of the subtlest, yet most delightful expressions of company culture, and too many times have coworkers wondered "who made that emoji?" or "what does this emoji mean?" Emoji Studio is a simple way to answer those questions. Some might think it's pointless, but then again, remember NFTs?
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>How does it work?</AccordionTrigger>
              <AccordionContent>
                <p>Emoji Studio works by asking the user to copy the same request their web browser makes on Slack's website and pasting it into this app. The app parses the URL and makes the same request to Slack, processes the emojis in the response, and stores them in browser storage. The app then visualizes the emojis in the dashboard.</p>
                <br />
                <p> An example payload response from Slack is structured as a JSON array, with an individual emoji object looking like this:</p>
                <pre className="bg-muted p-4 rounded-md text-xs overflow-auto mt-2">
<code>{`{
  "name": "emoji_name",
  "is_alias": 0,
  "alias_for": "",
  "url": "https://emoji.slack-edge.com/TEAM_ID/%252B/UUID.png",
  "team_id": "TEAM_ID",
  "user_id": "USER_ID",
  "created": 1587667197,
  "is_bad": false,
  "user_display_name": "USER_NAME",
  "avatar_hash": "AVATAR_HASH",
  "can_delete": false,
  "synonyms": []
}`}</code>
 </pre>
 <br />
<p>From knowing only this response, we can analyze quite a bit about the emojis in a workspace, such as top contributors, common emoji names, and emoji creation trends.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Can't Slack shut this down?</AccordionTrigger>
              <AccordionContent>
                Probably? I'm not sure. The important thing is that all data is processed locally in your browser - nothing is sent to any servers. If Slack wanted to stop this, they'd have to re-work how the emoji presentation API works, and I'm not sure that's a high priority for them.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>Is Emoji Studio secure?</AccordionTrigger>
              <AccordionContent>
                Yes, Emoji Studio is completely secure. The application requires a user to fetch a specific curl command from their Slack workspace, which is then used to fetch emoji data from Slack. All data is processed locally in your browser - nothing is sent to any servers. Check out the GitHub repo for confirmation.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
