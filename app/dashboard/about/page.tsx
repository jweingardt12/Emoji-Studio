"use client";

import React from "react";
import Image from "next/image";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GradientText } from "@/components/ui/gradient-text";
import { useOpenPanel } from '@openpanel/nextjs';

export default function AboutPage() {
  const { track: opTrack } = useOpenPanel();

  const faqItems = [
    {
      value: "item-1",
      trigger: "What is Emoji Studio?",
      content: "Emoji Studio is a comprehensive toolkit for managing Slack custom emojis. It not only visualizes and explores your workspace's emoji collection with trends and leaderboards, but also lets you create perfectly formatted emojis from images, videos, or GIFs. Plus, you can manage your personal emoji contributions with rename, delete, and alias features. Yes, it's a bit silly, but also surprisingly useful."
    },
    {
      value: "item-2",
      trigger: "Why would you make this?",
      content: (
        <>
          <a href="https://www.linkedin.com/in/jasonweingardt/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
            Every company I've worked at
          </a> has had one thing in common: a thriving custom Slack emoji collection. Emojis are one of the subtlest, yet most delightful expressions of company culture, and too many times have coworkers wondered "who made that emoji?" or "what does this emoji mean?" Emoji Studio is a simple way to answer those questions. Some might think it's pointless, but then again, remember NFTs?
        </>
      )
    },
    {
      value: "item-3",
      trigger: "How does it work?",
      content: (
        <>
          <p>Emoji Studio works by asking the user to copy the same request their web browser makes on Slack's website and pasting it into this app. The app parses the URL and makes the same request to Slack, processes the emojis in the response, and stores them in browser storage. The app then visualizes the emojis in the dashboard.</p>
          <video 
            src="/assets/emoji-studio-how-to.mp4" 
            controls 
            preload="metadata" 
            className="w-full rounded-md my-4"
            muted
            onPlay={() => {
              opTrack('video_play', {
                source: 'about_page_faq_video',
                video_src: '/assets/emoji-studio-how-to.mp4'
              });
            }}
          >
            Your browser does not support the video tag.
          </video>
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
        </>
      )
    },
    {
      value: "item-4",
      trigger: "Can't Slack shut this down?",
      content: "Probably? I'm not sure. The important thing is that all data is processed locally in your browser - nothing is sent to any servers. If Slack wanted to stop this, they'd have to re-work how the emoji presentation API works, and I'm not sure that's a high priority for them."
    },
    {
      value: "item-5",
      trigger: "Is Emoji Studio secure?",
      content: (
        <>
          Yes, Emoji Studio is completely secure. The application requires a user to fetch a specific curl command from their Slack workspace, which is then used to fetch emoji data from Slack. All data is processed locally in your browser - nothing is sent to any servers. Check out the <a href="https://github.com/jweingardt12/Emoji-Studio" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">GitHub repo</a> for confirmation. Analytics are collected, but no tokens/company info is sent.
        </>
      )
    },
    {
      value: "item-6",
      trigger: "What's your monetization strategy?",
      content: (
        <>
          If you're asking this question, you're thinking entirely too hard about the seriousness of this project. However, if you have ideas,  <a href="https://jwe.in" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">shoot me a note!</a>
        </>
      )
    },
    {
      value: "item-7",
      trigger: "What can I do with the Create and My Emojis features?",
      content: (
        <>
          <p><strong>Create Emojis:</strong> Upload any image, video, or GIF and we'll automatically process it to meet Slack's requirements:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Resize to 128x128 pixels while maintaining aspect ratio</li>
            <li>Optimize file size (under 128KB for images, 64KB for GIFs)</li>
            <li>Convert videos to animated GIFs</li>
            <li>Process multiple files at once</li>
            <li>Preview before downloading</li>
          </ul>
          <p className="mt-3"><strong>My Emojis:</strong> Manage all the emojis you've created in your workspace:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>View all your emoji contributions</li>
            <li>Rename emojis (downloads, deletes old, uploads with new name)</li>
            <li>Replace emoji images while keeping the name</li>
            <li>Create aliases for existing emojis</li>
            <li>Delete emojis you no longer need</li>
            <li>Sort by name or creation date</li>
            <li>Switch between table and grid views</li>
          </ul>
        </>
      )
    },
    {
      value: "item-8",
      trigger: "How do you plan to incorporate AI into this tool?",
      content: ":you-have-to-be-kidding-me:"
    }
  ];

  return (
    <div className="py-8 px-2 sm:px-4 lg:px-6 flex justify-center">
      <div className="rounded-xl bg-card border border-border shadow p-4 sm:p-8 max-w-4xl w-full animate-fade-up">
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-16 h-16 mb-3">
            <Image src="/logo.png" alt="Emoji Studio Logo" fill className="object-contain" priority />
          </div>
          <GradientText as="h1" className="text-3xl font-bold text-center">
            Emoji Studio
          </GradientText>
          <p className="text-muted-foreground text-sm mt-1">Sometimes the most important OKRs are LOLs.</p>
        </div>
        <p className="mb-6 text-base sm:text-sm">
          Emoji Studio is your all-in-one Slack emoji toolkit. Beyond visualizing and analyzing your workspace's custom emoji collection, it empowers you to create new emojis with automatic formatting for Slack's requirements. Upload images, videos, or GIFs and watch them transform into perfectly sized emojis. Manage your personal emoji contributions with the My Emojis page - rename, delete, add aliases, and even replace emoji images without losing their history. This product exists because while Slack makes it simple to create emojis, it doesn't provide good tools to explore, manage, or optimize them.
          <br />
          <br />
          <a href="https://jwe.in?utm_source=emojistudio&utm_medium=aboutpage" target="_blank" rel="noopener noreferrer" 
             onClick={() => opTrack('external_link_click', { destination: 'creator_website_about_page', url: 'https://jwe.in?utm_source=emojistudio&utm_medium=aboutpage', source: 'about_page' })} >
            This project also serves as a way for me (<u>Jason</u>) to learn and experiment with building out some of the silly ideas I've had on my own backlog.
          </a>
        </p>
        <div className="border-t border-border my-10"></div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">FAQs</h1>
        <div>
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full text-left">
            {faqItems.map((item) => (
              <AccordionItem value={item.value} key={item.value}>
                <AccordionTrigger 
                  onClick={() => 
                    opTrack('faq_toggle', { 
                      faq_id: item.value, 
                      faq_question: item.trigger, 
                      source: 'about_page' 
                    })
                  }
                >
                  {item.trigger}
                </AccordionTrigger>
                <AccordionContent>{item.content}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
