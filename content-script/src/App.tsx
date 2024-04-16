/// <reference types="chrome" />
/// <reference types="vite-plugin-svgr/client" />


import { createRoot } from 'react-dom/client';

import { useState, useEffect, useRef } from 'react';
import '@radix-ui/themes/styles.css';
import Logo from "./Logo";
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Button } from '@radix-ui/themes';
import { CaretDownIcon, ReloadIcon, CaretUpIcon } from '@radix-ui/react-icons';
import "./styles.scss";
import { Theme } from '@radix-ui/themes';
import lodash from "lodash"
import ReactDOM from 'react-dom';
import OpenAI from 'openai';

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
// dotenv.config();

function isDarkMode() {
  const bgColor = window.getComputedStyle(document.querySelector("body")!).backgroundColor;
  if (bgColor === 'rgb(0, 0, 0)' || bgColor === '#000' || bgColor === 'black') {
    return true;
  }
  return false;
}

type ToggleGroupButtonProps = {
  onReloadClick: () => void; // Correctly type `onReloadClick` as a function
};

const ToggleGroupButton = ({ onReloadClick }: ToggleGroupButtonProps) => (
  <ToggleGroup.Root
    className="ToggleGroup"
    type="single"
    defaultValue="center"
    aria-label="Text alignment"
  >
    <ToggleGroup.Item className="ToggleGroupItem" value="left" aria-label="Left aligned">
      <CaretDownIcon />
    </ToggleGroup.Item>
    <ToggleGroup.Item className="ToggleGroupItem" value="center" aria-label="Center aligned" onClick={onReloadClick}>
      <ReloadIcon />
    </ToggleGroup.Item>
    <ToggleGroup.Item className="ToggleGroupItem" value="right" aria-label="Right aligned">
      <CaretUpIcon />
    </ToggleGroup.Item>
  </ToggleGroup.Root>
);

interface responseType {
  summary: string,
  summarize_count: number,
}

async function summarize(textContent: string, profileInfo: ProfileInfo): Promise<responseType | undefined> {
  const endpoint_url = "https://santized-link";
  try {
    // Assuming postContentDom.textContent contains the text to be summarized
    console.log(">>summarize profileInfo", profileInfo)
    const requestBody = {
      query_string: textContent,
      profile_info: profileInfo,
    };

    const response = await fetch(endpoint_url, {
      method: 'POST',
      headers: {
      },
      body: JSON.stringify(requestBody)
    });

    const jsonResponse: responseType = await response.json();
    return jsonResponse

  } catch (error) {
    console.error(error)
  }

}

type SummarizeButtonProps = {
  emberNum: number;
  postContentDom: Element;
  onSummarizeClick: () => void;
  isLoading: boolean;
  setShowSummarize?: (bool: boolean) => void;
};

// Define the type for SummarizeComponent props
type SummarizeComponentProps = {
  emberNum: number;
  postContentDom: Element;
  apiKeySet: boolean;
  setApiKeySet?: any;
  profileInfo: ProfileInfo;
  postContent: string;
};


function SummarizeButton({ emberNum, postContentDom, onSummarizeClick, isLoading, setShowSummarize }: SummarizeButtonProps) {
  return (
    // <Button size={"4"} loading="true"> Summarize </Button>
    <Theme>
      <Button size={"3"} loading={isLoading} onClick={onSummarizeClick}> Summarize </Button >
    </Theme>
  );
}

const SummarizeComponent = ({ emberNum, postContentDom, postContent, apiKeySet, setApiKeySet, profileInfo }: SummarizeComponentProps) => {
  const [showSummarize, setShowSummarize] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  const handleSummarizeClick = async () => {
    try {
      const jsonResponse: responseType | undefined = await summarize(postContent, profileInfo);

      if (jsonResponse === undefined) {
        console.error("responseType undefined")
        return
      }


      const summarizedText = jsonResponse.summary;
      if (jsonResponse.summarize_count) {
        // store in chrome storage

        chrome.storage.local.set({ summarize_count: jsonResponse.summarize_count }, () => {
          console.log(' summarize_count is saved: ', jsonResponse.summarize_count);
        });

      }

      // const summarizedText = "hi"
      console.log("Summarized Text:", summarizedText);

      // Update the text content of the postContentDom element
      if (postContentDom && postContent) {
        console.log('replacing', postContentDom)
        postContentDom.textContent = summarizedText;
      } else {
        console.error("could not find postContentDom")
      }
    } catch (error) {
      console.error("Error summarizing text:", error)
    } finally {
      setIsLoading(false);
    }
  }

  const onSummarizeClick = async () => {
    setIsLoading(true);
    await handleSummarizeClick(); // Call the summarize function
    setShowSummarize(false);
    // setApiKeySet.current = true;
  }


  useEffect(() => {
    console.log(`isLoading updated: ${isLoading}`);
  }, [isLoading]);

  useEffect(() => {
    console.log(`apiKeySet updated: ${apiKeySet}`);
  }, [apiKeySet]);

  const wordCount = postContent.split(" ").length;

  return (
    <div className={isDarkMode() ? 'dark-theme' : 'light-theme'}>
      <div className="App">
        <div className="app-wrap">
          <div className="text-wrap">
            <div className="summarize-flex">
              {showSummarize ? <b>🥱 This post looks pretty long ({wordCount} words)</b> : <b>🎉 Summary complete!</b>}
            </div>
            {showSummarize ? <p>Want to summarize it with AI?</p> : <p>Rate or redo your summary if needed.</p>}
          </div>
          <div className="button-wrap">
            {showSummarize ? (
              <SummarizeButton emberNum={emberNum} postContentDom={postContentDom} onSummarizeClick={onSummarizeClick} isLoading={isLoading} />
            ) : (
              <ToggleGroupButton onReloadClick={handleSummarizeClick} />
            )}
          </div>
          {/* )} */}
        </div>
      </div>
    </div>
  );
}


type ProfileInfo = {
  profile_url: string;
  profile_id: string;
};


function App() {
  let emberNums = new Map<number, string>(); // id : text content
  let latestEmber = useRef(1)
  const lastEmberNumRef = useRef(1);
  const _THRESHOLD = 100// character count
  const seeMoreMap = new Map<number, HTMLButtonElement>() // id : HTMLButton
  const setApiKeySet = useRef(false); // State to track if the API key has been set

  async function findProfileInfo(): Promise<ProfileInfo | null> {
    return new Promise((resolve, reject) => {
      // Function to handle mutations
      const processMutation = (mutationsList: MutationRecord[], observer: MutationObserver): void => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE && node instanceof HTMLElement) {
                // console.log("gotem")
                const emberDom: HTMLAnchorElement | null = document.body.querySelector(
                  `div.scaffold-layout.scaffold-layout--breakpoint-xl.scaffold-layout--sidebar-main-aside.scaffold-layout--reflow div div div div div.feed-identity-module.artdeco-card.overflow-hidden.mb2 div a`
                ) || document.body.querySelector("div.scaffold-layout.scaffold-layout--breakpoint-none.scaffold-layout--sidebar-main-aside.scaffold-layout--single-column.scaffold-layout--reflow > div > div > div > div > div a")
                  || document.body.querySelector(`div.scaffold-layout.scaffold-layout--breakpoint-md.scaffold-layout--sidebar-main-aside.scaffold-layout--reflow > div > div > div > div > div.feed-identity-module.artdeco-card.overflow-hidden.mb2 > div.feed-identity-module__actor-meta.break-words a`)
                  || document.body.querySelector("div.scaffold-layout.scaffold-layout--breakpoint-lg.scaffold-layout--sidebar-main-aside.scaffold-layout--reflow > div > div > div > div > div.feed-identity-module.artdeco-card.overflow-hidden.mb2 > div.feed-identity-module__actor-meta.break-words a")
                if (emberDom) {
                  console.log(emberDom)
                  const hrefValue = emberDom.href;
                  if (hrefValue) {
                    const profile_url = hrefValue;
                    const profile_id = hrefValue.split('/')[4]
                    profileInfo = { profile_url, profile_id };
                    observer.disconnect(); // Stop observing after finding the info
                    resolve(profileInfo);
                    return;
                  }
                }
              }
            }
          }
        }
        // If no relevant mutation is found, continue observing
      };

      // ceate an observer instance
      const observer = new MutationObserver(processMutation);
      const config: MutationObserverInit = { childList: true, subtree: true };
      observer.observe(document.body, config);

      // timeout
      setTimeout(() => {
        observer.disconnect();
        reject(new Error("Profile information could not be found within the time limit."));
      }, 5000); // 5 secs
    });
  }

  // Usage
  async function handleProfileSearch() {
    try {
      const profileInfo = await findProfileInfo();
      if (profileInfo) {
        console.log('Profile Found:', profileInfo);
      } else {
        console.log('No profile information found.');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
  // profileInfo stuff
  let profileInfo: ProfileInfo = { profile_url: "none", profile_id: "none" };
  handleProfileSearch();
  findProfileInfo();

  useEffect(() => {

    const handleScroll = lodash.throttle(() => {
      console.log(">>handleScroll");
      console.log("lastEmberNumRef.current", lastEmberNumRef.current)
      const limit = lastEmberNumRef.current + 500;
      for (let emberNum = lastEmberNumRef.current; emberNum < limit; emberNum += 1) {
        const appendArea = document.querySelector(`#ember${emberNum} > div > div.feed-shared-update-v2__description-wrapper.mr2 > div > div`)
        const seeMore = document.querySelector(`#ember${emberNum} > div > div.feed-shared-update-v2__description-wrapper.mr2 > div > button`) as HTMLButtonElement | null;

        if (appendArea && !(emberNums.has(emberNum))) {
          lastEmberNumRef.current = emberNum;
        }
        // only if user clicks see more
        seeMore?.addEventListener("click", () => {
          if (appendArea && !(emberNums.has(emberNum))) {

            const postContentDom = document.querySelector(`#ember${emberNum} > div > div.feed-shared-update-v2__description-wrapper.mr2 > div > div.update-components-text.relative.update-components-update-v2__commentary`)
            const postContent = document.querySelector(`#ember${emberNum} > div > div.feed-shared-update-v2__description-wrapper.mr2 > div > div > span > span > span`)?.textContent
              || document.querySelector(`#ember${emberNum} > div > div.feed-shared-update-v2__description-wrapper.mr2 > div > div > span > span`)?.textContent
              || document.querySelector(`#ember${emberNum} > div > div.feed-shared-update-v2__description-wrapper.mr2 > div > div.update-components-text.relative.update-components-update-v2__commentary`)?.textContent
            console.log("id: ", emberNum, "\n", "content:", postContent, appendArea);

            if (postContent && postContentDom) {
              emberNums.set(emberNum, postContent);
              // console.log(emberNums)

              // check if it's over the _THRESHOLD
              if (postContent?.length > _THRESHOLD) {
                console.log("first profileinfo", profileInfo)
                insertSummarizeComponent(appendArea, emberNum, postContentDom, postContent, profileInfo)
              }
            }

            console.log("lastEmberNumRef.current", lastEmberNumRef.current)
          }
        })

      }
    }, 500); // throttle time

    handleScroll(); // init call
    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [])

  function insertSummarizeComponent(appendArea: Element, emberNum: number, postContentDom: Element, postContent: string, profileInfo: ProfileInfo,) {
    const summarizeContainer = document.createElement('div');
    summarizeContainer.className = 'summarize-component-container'; //optionial

    // append
    const parent = appendArea.parentNode!;
    parent.insertBefore(summarizeContainer, appendArea);

    // Use createRoot to render the SummarizeComponent into the new container
    const root = createRoot(summarizeContainer);
    (!setApiKeySet.current) ? root.render(<SummarizeComponent emberNum={emberNum} postContentDom={postContentDom} postContent={postContent} apiKeySet={false} setApiKeySet={setApiKeySet} profileInfo={profileInfo} />) : root.render(<SummarizeComponent emberNum={emberNum} postContentDom={postContentDom} postContent={postContent} apiKeySet={true} profileInfo={profileInfo} />);

  }
  return (<div />);
}

export default App;
