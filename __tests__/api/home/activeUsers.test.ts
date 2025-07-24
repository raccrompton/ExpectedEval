import { getActiveUserCount } from 'src/api/home/activeUsers'

describe('getActiveUserCount', () => {
  it('should return a positive number', async () => {
    const count = await getActiveUserCount()
    expect(count).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(count)).toBe(true)
  })

  it('should return different values on multiple calls (simulated variation)', async () => {
    const count1 = await getActiveUserCount()
    const count2 = await getActiveUserCount()
    const count3 = await getActiveUserCount()

    // At least one should be different due to random variation
    const allSame = count1 === count2 && count2 === count3
    expect(allSame).toBe(false)
  })

  it('should return reasonable values (1-50 range)', async () => {
    const count = await getActiveUserCount()
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(50)
  })
})
