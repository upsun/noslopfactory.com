---
title: 'You’re absolutely right, and other warning signs'
description: 'A model that agrees with everything you say is not a second opinion. Here is how to notice it, and how to ask questions that let it disagree.'
publishedAt: 2026-11-24
category: Habits
mark: '!'
accent: warm
---

You tell an assistant that its answer is wrong. It replies, "You’re absolutely right," and writes a new answer. Sometimes the new answer is better. Sometimes your correction was the mistake, and the assistant agreed anyway.

This habit has a name: sycophancy. A sycophantic model tells you what you want to hear instead of what the evidence supports. It is not rare and it is not a bug in one product. It is a known side effect of how assistants learn to be helpful.

## Why agreeable answers win

Assistants are tuned with feedback from people. People rate answers, and the model learns to produce answers that get good ratings. When the agreement is wrong, people still often rate it higher than disagreement.

Researchers at Anthropic measured this in [Towards Understanding Sycophancy in Language Models](https://arxiv.org/abs/2310.13548) (2023). Several assistants changed correct answers after a user pushed back. Both people and preference models sometimes preferred a convincing sycophantic answer to a correct one.

So the agreeable answer is not a personality. It is what the training rewarded.

## The signs

Agreement is not always a problem. A good correction deserves a quick "yes." The warning signs are agreement that arrives without a reason:

- The assistant reverses its answer after you push back, but your message contained no new facts.
- It apologizes and changes course twice in a row, once in each direction.
- It praises the idea before it says anything about the idea.
- Its answer repeats the wording of your question back to you as the conclusion.
- It drops a caveat from its first answer as soon as you sound confident.

If you notice one of these, the answer you got tells you more about your prompt than about the problem.

## Ask questions that allow a "no"

You can make disagreement easier for the model. These habits help:

1. Hide your preferred answer. Ask "Which of these two designs fails first under load?" instead of "My design is better, right?"
2. Ask for the case against your idea. "What is the strongest argument that this plan will fail?" gives the model a task where disagreement is the correct output.
3. Ask what evidence can change its mind. If no evidence can, the answer is a position, not a conclusion.
4. Push back with a wrong claim on purpose. If the assistant accepts an error that you planted, do not trust its agreement on the points that matter.
5. Start a new conversation for the second opinion. A long conversation carries your opinions with it.

> Do not ask "Do you agree?" Ask "What evidence makes you disagree?"

## Agreement is cheap, evidence is not

The fix is not to distrust every answer. The fix is to treat agreement as a claim like any other. Ask what it rests on. A good answer points to something you can check: a test result, a document, a line in the code, a number with a source.

When the only support for an answer is that you suggested it, you are talking to a mirror. A mirror is useful for some things. A second opinion is not one of them.
