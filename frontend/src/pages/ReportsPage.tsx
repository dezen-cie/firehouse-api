import Header from '../components/Header'
import AdminTabs from '../components/AdminTabs'
import './ReportsPage.scss'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'

type Bucket = Record<number, { AVAILABLE:number, INTERVENTION:number, UNAVAILABLE:number, ABSENT:number }>

const CHART_HEIGHT = 160 

export default function ReportsPage(){
  const [date, setDate] = useState<string>(()=>new Date().toISOString().slice(0,10))
  const [items, setItems] = useState<any[]>([])
  const [counts, setCounts] = useState<any>({AVAILABLE:0,INTERVENTION:0,UNAVAILABLE:0,ABSENT:0})
  const [buckets, setBuckets] = useState<Bucket>({} as Bucket)

  async function load(d:string){
    const r = await api.get('/reports/daily', { params: { date: d } })
    setItems(r.data.items)
    setBuckets(r.data.buckets)
    setCounts(r.data.counts)
  }
  useEffect(()=>{ load(date) },[date])

  const bars = useMemo(()=>{
    const arr: { h:number, AV:number, BUSY:number, ABS:number }[] = []
    for(let h=0; h<24; h++){
      const b = buckets[h] || {AVAILABLE:0,INTERVENTION:0,UNAVAILABLE:0,ABSENT:0}
      const busy = (b.INTERVENTION||0) + (b.UNAVAILABLE||0)
      arr.push({ h, AV:b.AVAILABLE||0, BUSY:busy, ABS:b.ABSENT||0 })
    }
    return arr
  },[buckets])

  const totalUsers = useMemo(
    ()=> Math.max(10, (counts.AVAILABLE||0)+(counts.INTERVENTION||0)+(counts.UNAVAILABLE||0)+(counts.ABSENT||0)),
    [counts]
  )
  const yMax = useMemo(()=> (totalUsers % 2 === 0 ? totalUsers : totalUsers + 1), [totalUsers])

  const yTicks = useMemo(()=>{
    const ticks:number[] = []
    for(let v=0; v<=yMax; v+=2) ticks.push(v)
    return ticks.reverse()
  }, [yMax])

  const gridStep = CHART_HEIGHT / Math.max(1, yMax/2)

  return (
    <div className="reports-page">
      <Header/>
      <AdminTabs/>
      
      <div className="content">
        <div className="row">
          <label>Jour</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </div>

        <h2>Journal du jour</h2>

        <div className="chart">
          <div className="title">Historique des 24 dernières heures</div>

          <div
            className="plot"
            style={{
              ['--grid-step' as any]: `${gridStep}px`,
              ['--chart-h' as any]: `${CHART_HEIGHT}px`,
              ['--bar-gap' as any]: `9px`,
            }}
          >

            <div className="yaxis">
              {yTicks.map((t, i)=>(
                <div className="tick" key={i}>{t}</div>
              ))}
            </div>

            <div className="pane">
              <div className="bars">
                {bars.map(b=>(
                  <div className="bar" key={b.h}>
                    <div className="stack">
                      <span className="s absent"     style={{height:`${(b.ABS  / yMax) * CHART_HEIGHT}px`}} />
                      <span className="s busy"       style={{height:`${(b.BUSY / yMax) * CHART_HEIGHT}px`}} />
                      <span className="s available"  style={{height:`${(b.AV   / yMax) * CHART_HEIGHT}px`}} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="xaxis">
                {bars.map(b=>(
                  <div className="xlab" key={b.h}>{String(b.h).padStart(2,'0')}h</div>
                ))}
              </div>
            </div>
          </div>

          <div className="legend">
            <div className="leg"><span className="dot available" /> Disponibles</div>
            <div className="leg"><span className="dot busy" /> Indisponibles/interventions</div>
            <div className="leg"><span className="dot absent" /> Absents</div>
          </div>
        </div>

        <div className="items">
          {items.map((it,i)=>(
            <div className="item" key={i}>
              <img src="/illu-pompier.png" alt="avatar"/>
              <div className="meta">
                <div className="name">{it.User.firstName} {it.User.lastName}</div>
                <div className="grade">{it.User.grade || '—'}</div>
                <div className="note">
                  {it.comment || ''} {it.returnAt ? `(retour: ${new Date(it.returnAt).toLocaleString('fr-FR')})` : ''}
                </div>
              </div>
              <div className={
                "tag "+(
                  it.status==='AVAILABLE'?'green':
                  it.status==='UNAVAILABLE'?'yellow':
                  it.status==='INTERVENTION'?'red':'grey'
                )
              }>
                {it.status==='AVAILABLE'?'Disponible':
                 it.status==='INTERVENTION'?'Intervention':
                 it.status==='UNAVAILABLE'?'Indisponible':'Absent'}
              </div>
            </div>
          ))}
        </div>

        <div className="stats">
          <div className="tile"><div>Disponibles</div><b>{counts.AVAILABLE}</b></div>
          <div className="tile"><div>Interventions</div><b>{counts.INTERVENTION}</b></div>
          <div className="tile"><div>Indisponibles</div><b>{counts.UNAVAILABLE}</b></div>
          <div className="tile"><div>Absents</div><b>{counts.ABSENT}</b></div>
        </div>

      </div>
    </div>
  )
}
