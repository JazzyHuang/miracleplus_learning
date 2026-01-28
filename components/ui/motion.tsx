"use client";

import { motion, HTMLMotionProps, useScroll, useTransform, MotionValue } from "framer-motion";
import React, { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * FadeIn Component
 * Simple fade-in animation with optional delay and direction
 */
interface FadeInProps extends HTMLMotionProps<"div"> {
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  duration?: number;
  fullWidth?: boolean;
}

export const FadeIn = ({
  children,
  delay = 0,
  direction = "up",
  duration = 0.5,
  className,
  fullWidth = false,
  ...props
}: FadeInProps) => {
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 20 : direction === "down" ? -20 : 0,
      x: direction === "left" ? 20 : direction === "right" ? -20 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        duration,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98], // Custom ease for smooth motion
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={variants}
      className={cn(fullWidth ? "w-full" : "", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * StaggerContainer Component
 * Orchestrates staggered animations for children
 */
interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  staggerChildren?: number;
  delayChildren?: number;
}

export const StaggerContainer = ({
  children,
  staggerChildren = 0.1,
  delayChildren = 0,
  className,
  ...props
}: StaggerContainerProps) => {
  const variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * TextReveal Component
 * Reveals text character by character or word by word
 */
interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  mode?: "char" | "word";
}

export const TextReveal = ({ text, className, delay = 0, mode = "word" }: TextRevealProps) => {
  const words = text.split(" ");
  const chars = text.split("");

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: delay * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };

  if (mode === "char") {
    return (
      <motion.span
        className={cn("inline-block", className)}
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {chars.map((char, index) => (
          <motion.span variants={child} key={index}>
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.span>
    );
  }

  return (
    <motion.div
      className={cn("flex flex-wrap gap-x-[0.25em]", className)}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {words.map((word, index) => (
        <motion.span variants={child} key={index} className="inline-block">
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

/**
 * GlowBorder Component
 * Adds a glowing border effect on hover or static
 */
export const GlowBorder = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={cn("relative group", className)}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-lg blur opacity-20 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
      <div className="relative bg-black rounded-lg">{children}</div>
    </div>
  );
};

/**
 * ParallaxScroll Component
 * Moves content at different speed than scroll
 */
export const ParallaxScroll = ({
  children,
  offset = 50,
  className,
}: {
  children: React.ReactNode;
  offset?: number;
  className?: string;
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
};
