import { ChatContentContext } from '@/pages/chat';
import { LoadingOutlined } from '@ant-design/icons';
import { Button, Input, Spin } from 'antd';
import classNames from 'classnames';
import { useSearchParams } from 'next/navigation';
import React, { forwardRef, useContext, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { UserChatContent } from '@/types/chat';
import { parseResourceValue } from '@/utils';
import ToolsBar from './ToolsBar';

const ChatInputPanel: React.ForwardRefRenderFunction<any, { ctrl: AbortController }> = ({ ctrl }, ref) => {
  const { t } = useTranslation();
  const {
    replyLoading,
    handleChat,
    appInfo,
    currentDialogue,
    temperatureValue,
    maxNewTokensValue,
    resourceValue,
    setResourceValue,
    refreshDialogList,
  } = useContext(ChatContentContext);

  const searchParams = useSearchParams();
  const scene = searchParams?.get('scene') ?? '';
  const select_param = searchParams?.get('select_param') ?? '';

  const [userInput, setUserInput] = useState<string>('');
  const [isFocus, setIsFocus] = useState<boolean>(false);
  const [isZhInput, setIsZhInput] = useState<boolean>(false);

  const submitCountRef = useRef(0);

  const paramKey: string[] = useMemo(() => {
    return appInfo.param_need?.map(i => i.type) || [];
  }, [appInfo.param_need]);

  const onSubmit = async () => {
    submitCountRef.current++;
    // Remove immediate scroll to avoid conflict with ChatContentContainer's auto-scroll
    // ChatContentContainer will handle scrolling when new content is added
    setUserInput('');
    const resources = parseResourceValue(resourceValue);
    // Clear the resourceValue if it not empty
    let newUserInput: UserChatContent;
    if (resources.length > 0) {
      if (scene !== 'chat_excel') {
        // Chat Excel scene does not need to clear the resourceValue
        // We need to find a better way to handle this
        setResourceValue(null);
      }
      const messages = [...resources];
      messages.push({
        type: 'text',
        text: userInput,
      });
      newUserInput = {
        role: 'user',
        content: messages,
      };
    } else {
      newUserInput = userInput;
    }

    const params = {
      app_code: appInfo.app_code || '',
      ...(paramKey.includes('temperature') && { temperature: temperatureValue }),
      ...(paramKey.includes('max_new_tokens') && { max_new_tokens: maxNewTokensValue }),
      select_param,
      ...(paramKey.includes('resource') && {
        select_param:
          typeof resourceValue === 'string'
            ? resourceValue
            : JSON.stringify(resourceValue) || currentDialogue.select_param,
      }),
    };

    await handleChat(newUserInput, params);

    // 如果应用进来第一次对话，刷新对话列表
    if (submitCountRef.current === 1) {
      await refreshDialogList();
    }
  };

  // expose setUserInput to parent via ref
  useImperativeHandle(ref, () => ({
    setUserInput,
  }));

  return (
    <div className='flex flex-col w-5/6 mx-auto pt-4 pb-6 bg-transparent'>
      <div
        className={`flex flex-1 flex-col bg-white dark:bg-[rgba(255,255,255,0.16)] px-5 py-4 pt-2 rounded-xl relative border-t border-b border-l border-r dark:border-[rgba(255,255,255,0.6)] ${
          isFocus ? 'border-[#0c75fc]' : ''
        }`}
        id='input-panel'
      >
        <ToolsBar ctrl={ctrl} />
        <Input.TextArea
          placeholder={t('input_tips')}
          className='w-full h-20 resize-none border-0 p-0 focus:shadow-none dark:bg-transparent'
          value={userInput}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (e.shiftKey) {
                return;
              }
              if (isZhInput) {
                return;
              }
              e.preventDefault();
              if (!userInput.trim() || replyLoading) {
                return;
              }
              onSubmit();
            }
          }}
          onChange={e => {
            setUserInput(e.target.value);
          }}
          onFocus={() => {
            setIsFocus(true);
          }}
          onBlur={() => setIsFocus(false)}
          onCompositionStart={() => setIsZhInput(true)}
          onCompositionEnd={() => setIsZhInput(false)}
        />
        <Button
          type='primary'
          className={classNames(
            'flex items-center justify-center w-14 h-8 rounded-lg text-sm absolute right-4 bottom-3 bg-button-gradient border-0',
            {
              'cursor-not-allowed': !userInput.trim(),
            },
          )}
          onClick={() => {
            if (replyLoading || !userInput.trim()) {
              return;
            }
            onSubmit();
          }}
        >
          {replyLoading ? (
            <Spin spinning={replyLoading} indicator={<LoadingOutlined className='text-white' />} />
          ) : (
            t('sent')
          )}
        </Button>
      </div>
    </div>
  );
};

export default forwardRef(ChatInputPanel);
