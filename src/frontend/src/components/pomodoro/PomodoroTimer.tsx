import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { usePomodoroStore, formatTime, type PomodoroMode } from '@/stores/pomodoroStore'
import { db, updateTaskWithMindmapSync } from '@/lib/db'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Timer,
  X,
  Coffee,
  BrainCircuit,
} from 'lucide-react'

const MODE_LABEL: Record<PomodoroMode, string> = {
  focus: '专注中',
  shortBreak: '短休息',
  longBreak: '长休息',
}

const MODE_ICON: Record<PomodoroMode, typeof BrainCircuit> = {
  focus: BrainCircuit,
  shortBreak: Coffee,
  longBreak: Coffee,
}

const MODE_COLOR: Record<PomodoroMode, string> = {
  focus: 'text-priority-high',
  shortBreak: 'text-priority-medium',
  longBreak: 'text-primary',
}

const RING_COLOR: Record<PomodoroMode, string> = {
  focus: 'stroke-priority-high',
  shortBreak: 'stroke-priority-medium',
  longBreak: 'stroke-primary',
}

export function PomodoroTimer() {
  const store = usePomodoroStore()
  const {
    isOpen,
    timeLeft,
    mode,
    isRunning,
    taskTitle,
    activeTaskId,
    sessionsCompleted,
    justCompleted,
  } = store

  // Tick interval
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      store.tick()
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, store])

  // Handle completion & update task pomodoro_count
  useEffect(() => {
    if (!justCompleted) return

    if (mode === 'shortBreak' || mode === 'longBreak') {
      // Just finished a focus session
      if (activeTaskId) {
        db.tasks.get(activeTaskId).then((task) => {
          if (task) {
            const newCount = (task.pomodoro_count || 0) + 1
            updateTaskWithMindmapSync(activeTaskId, {
              pomodoro_count: newCount,
            }).then(() => {
              toast.success(`专注完成！「${task.title}」已记录 ${newCount} 个番茄`)
            })
          } else {
            toast.success('专注完成！')
          }
        })
      } else {
        toast.success('专注完成！')
      }
    } else {
      // Just finished a break
      toast.success('休息结束，开始新的专注吧')
    }
    store.clearCompleted()
  }, [justCompleted, mode, activeTaskId, store])

  // Update document title when running
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      const label = MODE_LABEL[mode]
      document.title = `${formatTime(timeLeft)} · ${label} · MindFlow`
    } else {
      document.title = 'MindFlow'
    }
    return () => {
      document.title = 'MindFlow'
    }
  }, [isRunning, timeLeft, mode])

  // Request notification permission on first start
  useEffect(() => {
    if (isRunning && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [isRunning])

  // Send browser notification on completion
  useEffect(() => {
    if (!justCompleted) return
    if ('Notification' in window && Notification.permission === 'granted') {
      if (mode === 'shortBreak' || mode === 'longBreak') {
        new Notification('MindFlow · 专注完成', {
          body: taskTitle ? `「${taskTitle}」已完成一个番茄钟` : '休息一下吧',
          icon: '/favicon.ico',
        })
      } else {
        new Notification('MindFlow · 休息结束', {
          body: '准备好开始新的专注了吗？',
          icon: '/favicon.ico',
        })
      }
    }
  }, [justCompleted, mode, taskTitle])

  if (!isOpen) {
    return (
      <button
        onClick={() => store.setOpen(true)}
        className={cn(
          'fixed bottom-5 right-5 z-50',
          'w-11 h-11 rounded-full bg-bg-surface border border-border-default',
          'shadow-md flex items-center justify-center',
          'hover:border-border-hover hover:shadow-lg transition-all duration-fast'
        )}
        title='番茄钟'
      >
        <Timer className='w-5 h-5 text-text-secondary' />
      </button>
    )
  }

  const totalTime =
    mode === 'focus' ? 25 * 60 : mode === 'shortBreak' ? 5 * 60 : 15 * 60
  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  const ModeIcon = MODE_ICON[mode]

  return (
    <div
      className={cn(
        'fixed bottom-5 right-5 z-50',
        'w-[280px] bg-bg-surface border border-border-default rounded-xl',
        'shadow-lg p-4 flex flex-col items-center gap-3',
        'transition-all duration-fast',
        isRunning && 'shadow-glow ring-1 ring-primary/20'
      )}
    >
      {/* Header */}
      <div className='w-full flex items-center justify-between'>
        <div className='flex items-center gap-1.5'>
          <ModeIcon className={cn('w-4 h-4', MODE_COLOR[mode])} />
          <span className={cn('text-xs font-medium', MODE_COLOR[mode])}>
            {MODE_LABEL[mode]}
          </span>
        </div>
        <button
          onClick={() => store.setOpen(false)}
          className='text-text-muted hover:text-text-primary transition-colors'
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      {/* Task name */}
      {taskTitle && (
        <p className='text-xs text-text-muted truncate w-full text-center px-2'>
          {taskTitle}
        </p>
      )}

      {/* Progress Ring */}
      <div className='relative w-[120px] h-[120px] flex items-center justify-center'>
        <svg className='w-full h-full -rotate-90' viewBox='0 0 120 120'>
          {/* Background ring */}
          <circle
            cx='60'
            cy='60'
            r={radius}
            fill='none'
            className='stroke-bg-elevated'
            strokeWidth='6'
          />
          {/* Progress ring */}
          <circle
            cx='60'
            cy='60'
            r={radius}
            fill='none'
            className={cn(RING_COLOR[mode])}
            strokeWidth='6'
            strokeLinecap='round'
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className='absolute inset-0 flex flex-col items-center justify-center'>
          <span className='text-2xl font-mono font-semibold text-text-primary tracking-tight'>
            {formatTime(timeLeft)}
          </span>
          {sessionsCompleted > 0 && (
            <span className='text-2xs text-text-muted mt-0.5'>
              已完成 {sessionsCompleted} 个番茄
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className='flex items-center gap-2'>
        {isRunning ? (
          <Button
            variant='outline'
            size='icon'
            className='w-9 h-9 rounded-full'
            onClick={() => store.pause()}
          >
            <Pause className='w-4 h-4' />
          </Button>
        ) : (
          <Button
            variant='default'
            size='icon'
            className='w-9 h-9 rounded-full'
            onClick={() => store.resume()}
          >
            <Play className='w-4 h-4' />
          </Button>
        )}

        <Button
          variant='outline'
          size='icon'
          className='w-9 h-9 rounded-full'
          onClick={() => store.reset()}
          title='重置'
        >
          <RotateCcw className='w-4 h-4' />
        </Button>

        <Button
          variant='outline'
          size='icon'
          className='w-9 h-9 rounded-full'
          onClick={() => store.skip()}
          title='跳过'
        >
          <SkipForward className='w-4 h-4' />
        </Button>
      </div>

      {/* Mode switcher */}
      <div className='flex items-center gap-1 w-full'>
        {(['focus', 'shortBreak', 'longBreak'] as PomodoroMode[]).map((m) => (
          <button
            key={m}
            onClick={() => store.switchMode(m)}
            className={cn(
              'flex-1 text-2xs py-1 rounded-md transition-colors',
              mode === m
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
            )}
          >
            {m === 'focus' ? '25分' : m === 'shortBreak' ? '5分' : '15分'}
          </button>
        ))}
      </div>
    </div>
  )
}
